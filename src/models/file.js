const fs = require('fs')
const path = require('path')

module.exports = (con, DataTypes) => {
    const File = con.define('files', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        table_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        row_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        col_name: {
            type: DataTypes.STRING(50),
        },
        title: {
            type: DataTypes.STRING,
        },
        name_original: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_used: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        ext: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        sizes: {
            type: DataTypes.JSON,
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false,
        },
        sort: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        }
    }, {
        hooks: {
            beforeFind: async (query) => {},
            beforeDestroy: async (file, options) => {
                // 1) Pathes
                let pathStart = `./public/files`,
                    pathFile = `${file.name}.${file.ext}`;

                // 1) Check media type
                // image
                if (file.type && file.type.startsWith('image')) {
                    // 1) Check path
                    // procedural
                    pathStart = `./public/images/${file.table_name}`;
                    // gallery
                    if (file.name_used == 'gallery')
                    pathStart = `./public/images/${file.table_name}/gallery`;
                    // summernote
                    if (file.name_used == 'summernote')
                    pathStart = `./public/files/summernote`;

                    // 2) Remove
                    // no large & small
                    const sizes = file.sizes || {};
                    if (file.name_used == 'summernote') {
                        file.removeFromPath(`${pathStart}/${pathFile}`);
                    } else {
                        // Try to delete from all possible locations
                        // large
                        file.removeFromPath(`${pathStart}/large/${pathFile}`);
                        // small
                        file.removeFromPath(`${pathStart}/small/${pathFile}`);
                        // root
                        file.removeFromPath(`${pathStart}/${pathFile}`);
                    }
                }
                // file
                else {
                    file.removeFromPath(`${pathStart}/${pathFile}`);
                }
            }
        }
    });
    File.prototype.removeFromPath = async p => {
        const full = path.resolve(p);
        if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    return File;
}
