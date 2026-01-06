const { Gallery, File } = require("../models").models;
const AppError = require("../utils/appError");
const cache = require("../utils/cache");
const db = require("../utils/db").con;
const Files = require("../controllers/File");

const CACHE_KEY = "gallery:all";
const TTL = 120;

module.exports = {
    async getAll() {
        const cached = await cache.get(CACHE_KEY);
        if (cached) return { fromCache: true, items: cached };

        const rows = await Gallery.findAll({
            include: [{ association: "files" }],
            order: [["id", "DESC"]]
        });

        const items = rows.map(r => r.get({ plain: true }));
        await cache.set(CACHE_KEY, items, TTL);

        return { fromCache: false, items };
    },

    async create(data, files) {
        return await db.transaction(async t => {
            const gallery = await Gallery.create({
                title: data.title.trim(),
                text: data.text || null
            }, { transaction: t });

            if (files?.gallery_img) {
                await this._uploadImage(gallery, files.gallery_img, t);
            }

            await cache.del(CACHE_KEY);

            return await Gallery.findByPk(gallery.id, {
                include: [{ association: "files" }]
            });
        });
    },

    async update(id, data, files) {
        return await db.transaction(async t => {
            const item = await Gallery.findByPk(id, {
                include: [{ association: "files" }],
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!item) throw new AppError("Գալերիայի նյութը չի գտնվել", 404);

            if (data.title !== undefined) item.title = data.title.trim();
            if (data.text !== undefined) item.text = data.text;

            await item.save({ transaction: t });

            if (files?.gallery_img) {
                await this._uploadImage(item, files.gallery_img, t);
            }

            await cache.del(CACHE_KEY);

            return await Gallery.findByPk(item.id, {
                include: [{ association: "files" }]
            });
        });
    },

    async delete(id) {
        return await db.transaction(async t => {
            const item = await Gallery.findByPk(id, {
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!item) throw new AppError("Գալերիայի նյութը չի գտնվել", 404);

            await File.destroy({
                where: { row_id: id, table_name: "gallery" },
                transaction: t
            });

            await item.destroy({ transaction: t });

            await cache.del(CACHE_KEY);
        });
    },

    async _uploadImage(gallery, file, t) {
        const result = await new Files(gallery, file).replace("gallery_img");

        if (result.status !== "success") {
            const msg = typeof result.message === "object"
                ? Object.values(result.message).join(" ")
                : result.message;

            throw new AppError(msg || "Image upload failed", 400);
        }

        await gallery.createFile({
            ...result.table,
            row_id: gallery.id,
            table_name: "gallery"
        }, { transaction: t });
    }
};
