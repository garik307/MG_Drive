const fs = require("fs");
const crypto = require("crypto");
const sharp = require("sharp");

module.exports = class File {
    constructor(model, file, options = {}) {
        this.data = {};
        this.data.model = model;
        this.data.file = file;
        this.data.options = options;

        // result
        this.status = "error";
        this.message = {};

        this._setTableData();
    }

    /* Main methods */
    async add(name_used) {
        this.table.name_used = name_used;

        // 1) Check allowed - media[size, type], names
        const allowed = await this._checkAllowed();
        if (allowed.status == "error") {
            this.message = allowed.messages;
            return this._result();
        }

        // 2) Check media
        // image
        if (allowed.media.name == "image") {
            // 1) Check Watermark
            this.data.file.watermark = allowed.limits.watermark || false;

            // 2) Check dimensions for resizing
            // resize and save
            if (allowed.limits.dimensions) {
                // image width & height
                const {
                    width,
                    height
                } = this.data.file.metadata;
                // allowed dimensions
                const dimensions = allowed.limits.dimensions;
                // large
                if (dimensions.large) {
                    const resizeSaveLarge = await this._saveImage(
                        width,
                        height,
                        dimensions,
                        "large"
                    );
                    if (!resizeSaveLarge) return this._result();
                }
                // small
                if (dimensions.small) {
                    const resizeSaveSmall = await this._saveImage(
                        width,
                        height,
                        dimensions,
                        "small"
                    );
                    if (!resizeSaveSmall) return this._result();
                }
            }
            // no resize, save only
            else {
                const saveImage = await this._saveImage();
                if (!saveImage) return this._result();
            }
        }
        // audio, video, application (pdf, zip)
        else {
            // save file
            const saveFile = await this._saveFile();
            if (!saveFile) return this._result();
        }

        this.status = "success";
        return this._result();
    }

    async replace(name_used) {
        // 1) Check files
        if (!this.data.model.files) {
            this.message.files = `In "${this.table.table_name}" model "files" are not included.`;
            return this._result();
        }

        // 1) Remove old file
        const oldFile = this.data.model.files.find((f) => f.name_used == name_used);
        if (oldFile) {

            const deleted = await this._deleteImageFiles(oldFile);

            if (!deleted) {
                this.message = {
                    error: 'Failed to delete old image files.',
                };
                return this._result();
            }

            // DB
            await oldFile.destroy();
            // Model.files[]
            const index = this.data.model.files.indexOf(oldFile);
            this.data.model.files.splice(index, 1);
        }
        // 2) Add new file
        return await this.add(name_used);
    }

    async _deleteImageFiles(fileData) {
        const imageSizes = ["small", "large"];
        const baseFilePath = "./public/images"; 

        try {
            for (const size of imageSizes) {

                const filePath = `${baseFilePath}/${this.table.table_name}/${size}/${fileData.name}.${fileData.ext}`;

                // Check if the file exists before attempting to delete
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return true; // All image files were deleted successfully
        } catch (err) {
            console.error("Error deleting image files:", err);
            return false; // An error occurred while deleting image files
        }
    }
    /* Inner methods */
    // set only table data
    _setTableData() {
        this.table = {};
        // required
        this.table.table_name = this.data.model.constructor.name;
        this.table.row_id = this.data.model.id;
        (this.table.name_original = this.data.file.name),
        (this.table.name = crypto
            .createHash("sha1")
            .update(`${this.table.name_original}-${Date.now()}`)
            .digest("hex"));
        this.table.type = this.data.file.mimetype;

        // optional
        this.table.col_name = this.data.options.col_name || null;
        this.table.title = this.data.options.title || null;

        // console.log(this.data.file.name, "NAME");
        // procedural for images
        (this.table.ext = this.data.file.name.slice(
            this.data.file.name.lastIndexOf(".")
        )),
        (this.table.sizes = [this.data.file.size]);
        /* this.table.name_used = name; - add(), replace() */
    }

    // names, size, media, type (for files)
    async _checkAllowed() {
        const allowed = {};

        const media = this.data.file.mimetype.split("/")[0];
        const type = this.table.type.split("/")[1];
        const size = this.data.file.size;
        const count = this.data.model.files.filter(
            (f) => f.name_used == this.table.name_used
        ).length;

        allowed.limits = this._getAllowedLimits(
            this.table.table_name,
            this.table.name_used
        );
        allowed.media = this._getAllowedMedia(media);
        allowed.status = "error";
        allowed.messages = {};

        console.log("Allowed media: ", allowed.media ? true : false);
        console.log(
            "Allowed names:",
            allowed.limits.status == "success" ? true : false
        );

        // 1.1) Check media
        if (!allowed.media) {
            allowed.messages.media = `The "${this.data.file.mimetype}" media type is not allowed.`;
        } else {
            console.log("Allowed size: ", allowed.media.size >= size ? true : false);

            // 1.2) Check size
            if (allowed.media.size < size) {
                allowed.messages.size = `The size (${size} bytes) is too large, limit is ${allowed.media.size} bytes.`;
            }
        }

        // 1.3) Check names
        if (allowed.limits.status != "success") {
            // table_name
            if (allowed.limits.reason == "table") {
                allowed.messages.table = `Table "${this.table.table_name}" not found.`;
            }
            // name_used
            if (allowed.limits.reason == "name") {
                allowed.messages.name = `Name "${this.table.name_used}" for table "${this.table.table_name}" not found.`;
            }
        } else {
            console.log(
                "Allowed count:",
                allowed.limits.count > count ? true : false
            );

            // 1.4) Check count
            if (allowed.limits.count <= count) {
                allowed.messages.count = `Count limit for "${
          this.table.name_used
        }" in "${this.table.table_name}" table is "${allowed.limits.count}" ${
          allowed.limits.count > 1 ? "files" : "file"
        }.`;
            }
            // 1.5) Check type
            // file
            if (media != "image") {
                console.log(
                    "Allowed type (file): ",
                    allowed.limits.types.includes(type) ? true : false
                );

                if (!allowed.limits.types.includes(type)) {
                    allowed.messages.type = `The type "${type}" is not allowed. Allowed types are "${allowed.limits.types.toString()}".`;
                }
            }
            // image
            else {
                // image metadata (format, width, height)
                await this._setMetadata();
                this.table.ext = this.data.file.metadata.format;
                this.table.sizes = {};

                console.log(
                    "Allowed type (image): ",
                    allowed.limits.types.includes(this.table.ext) ? true : false
                );

                // check format
                if (!allowed.limits.types.includes(this.table.ext)) {
                    allowed.messages.format = `For "${
            this.table.name_used
          }" is not allowed "${
            this.table.ext
          }" format. Allowed only "${allowed.limits.types.join(", ")}" ${
            allowed.limits.types.length > 1 ? "formats" : "format"
          }.`;
                }
            }
        }

        // no errors
        if (!Object.keys(allowed.messages).length) {
            allowed.status = "success";
            delete allowed.messages;
        }

        return allowed;
    }
    // name, count, types, dimensions (for images)
    _getAllowedLimits(table, name) {
        // table - used names
        // ? - save to database
        const names = [
            {
                table: "questions",
                files: [{
                    name: "question_img",
                    count: 3,
                    types: ["jpeg", "png", "gif", "webp", "svg"],
                    dimensions: {
                        large: [1080, 1080]
                    },
                }],
            },
            {
                table: "users",
                files: [{
                    name: "user_img",
                    count: 3,
                    types: ["jpeg", "png", "gif", "webp", "svg"],
                    dimensions: {
                        large: [800, 800]
                    },
                }],
            },
            {
                table: "gallery",
                files: [{
                    name: "gallery_img",
                    count: 3,
                    types: ["jpeg", "png", "gif", "webp", "svg"],
                    dimensions: {
                        large: [1080, 1080]
                    },
                }],
            },
        ];

        // check table name
        let tableData = names.find((n) => n.table == table);
        if (!tableData) {
            return {
                status: "error",
                reason: "table",
            };
        }
        // check used name
        let nameData = tableData.files.find((n) => n.name == name);
        if (!nameData) {
            return {
                status: "error",
                reason: "name",
            };
        }

        // success
        nameData.status = "success";
        return nameData;
    }
    // media, types (for files), limit (size in bytes)
    _getAllowedMedia(media) {
        // ? - save to database
        const mediaTypes = [{
            name: "image",
            types: ["jpeg", "png", "gif", "webp", "svg"],
            size: 50 * 1024 * 1024,
        }];

        return mediaTypes.find((m) => m.name === media);
    }

    // for images only
    async _setMetadata() {
        const {
            format,
            width,
            height
        } = await sharp(this.data.file.data).metadata();
        this.data.file.metadata = {
            format,
            width,
            height
        };
    }

    // save
    async _saveImage(width, height, dimensions, size) {
        let image = sharp(this.data.file.data);
        // dynamic target format for smaller files
        let targetFormat = ['jpeg','png','webp'].includes(this.table.ext) ? this.table.ext : 'webp';
        let quality = targetFormat === 'png' ? 90 : 82;

        // 2) Paths
        const pathSize = size ? `/${size}` : "";
        const pathStart = `./public/images/${this.table.table_name}${pathSize}`;
        // ensure ext matches target format
        this.table.ext = targetFormat;
        const pathFile = `${this.table.name}.${this.table.ext}`;
        const fullPath = `${pathStart}/${pathFile}`;

        // 3) Check & create directory
        if (!fs.existsSync(pathStart)) fs.mkdirSync(pathStart, {
            recursive: true
        });

        // 4) Size validation & single resize
        if (width && height && dimensions) {
            if (width < dimensions[size][0]) {
                this.message.width = `Image width is ${width}, but must be >= ${dimensions[size][0]} (${size}: ${dimensions[size].join("x")})`;
            }
            if (height < dimensions[size][1]) {
                this.message.height = `Image height is ${height}, but must be >= ${dimensions[size][1]} (${size}: ${dimensions[size].join("x")})`;
            }
            image = image.resize(dimensions[size][0], dimensions[size][1], { fit: 'inside' });
        } else {
            image = image.resize(800, 800, { fit: 'inside' });
        }

        // 5) Add watermark if needed
        if (this.data.file.watermark) this._addWatermark(image);

        // 6) Save image
        try {
            const imageNew = await image.toFormat(targetFormat, { quality }).toFile(fullPath);

            // Save sizes
            if (width && height && dimensions) {
                this.table.sizes[size] = {
                    size: imageNew.size,
                    width: imageNew.width,
                    height: imageNew.height,
                };
            } else {
                this.table.sizes = {
                    size: imageNew.size,
                    width: imageNew.width,
                    height: imageNew.height,
                };
            }

            return {
                status: 'success'
            };

        } catch (err) {
            // ⚠️ If there is an error, we delete the file.
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

            this.message.file = "Image not saved... ⚠️";
            this.message.err = err;
            return false;
        }
    }

    async _saveFile() {
        // 1) Ճանապարհների ձևավորում
        let pathStart = `./public/files`;
        const pathFile = `${this.table.name}${this.table.ext}`;

        if (this.table.name_used === "summernote") {
            pathStart = `./public/files/summernote`;
        }

        // 2) Checking for the existence of the folder
        if (!fs.existsSync(pathStart)) {
            fs.mkdirSync(pathStart, {
                recursive: true
            });
        }

        // 3) Saving the file
        try {
            await this.data.file.mv(`${pathStart}/${pathFile}`);
            return {
                status: "success"
            };
        } catch (err) {
            this.message.file = "File not saved";
            this.message.err = err;
            return {
                status: "error",
                error: err
            }; // 
        }
    }

    // add watermark
    _addWatermark(image) {
        if (image.options.width >= 600 && image.options.height >= 600) {
            // watermark_xl.png (161x161)
            let pathWatermrk = "./public/images/watermark_xl.png",
                offsetX = image.options.width - 161 - 15,
                offsetY = image.options.height - 161 - 15;
            // add watermark
            image.composite([{
                input: pathWatermrk,
                left: offsetX,
                top: offsetY,
            }, ]);
        }
    }

    // return result
    _result() {
        delete this.data;
        this.status == "error" ? delete this.table : delete this.message;
        return this;
    }
};
