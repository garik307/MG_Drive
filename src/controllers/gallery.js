const galleryService = require("../services/gallery.service");
const AppError = require("../utils/appError");

module.exports = {

    async getGalleries(req, res, next) {
        try {
            const data = await galleryService.getAll();
            res.json({
                status: "success",
                ...data,
                time: `${Date.now() - req.time} ms`
            });
        } catch (e) {
            next(e);
        }
    },

    async addGallery(req, res, next) {
        try {
            if (!req.body.title || !req.body.title.trim()) {
                throw new AppError("Վերնագիր դաշտը պարտադիր է", 403);
            }

            const item = await galleryService.create(req.body, req.files);
            res.status(201).json({
                status: "success",
                item,
                time: `${Date.now() - req.time} ms`
            });
        } catch (e) {
            next(e);
        }
    },

    async updateGallery(req, res, next) {
        try {
            const item = await galleryService.update(req.params.id, req.body, req.files);
            res.json({
                status: "success",
                item,
                time: `${Date.now() - req.time} ms`
            });
        } catch (e) {
            next(e);
        }
    },

    async deleteGallery(req, res, next) {
        try {
            await galleryService.delete(req.params.id);
            res.status(204).json({ status: "success" });
        } catch (e) {
            next(e);
        }
    }
};