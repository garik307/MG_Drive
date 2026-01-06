// models/Groups.js
module.exports = (con, DataTypes) => {
    const Groups = con.define('groups', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false
        },

        number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },

        text: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        slug: DataTypes.STRING,

        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['number'] },
            { fields: ['slug'] }
        ]
    });


    // ---------- CLEAN TITLE + EXTRACT NUMBER ----------
    function cleanGroup(group) {
        // 1) extract number
        const match = group.title.match(/\d+/);
        group.number = match ? parseInt(match[0]) : 0;

        // 2) remove number from title
        group.title = group.title.replace(/\d+/g, '').trim();

        // 3) generate slug
        group.slug = group.title
            .toLowerCase()
            .replace(/\s+/g, '-');
    }

    // ---------- HOOKS ----------
    Groups.beforeCreate(cleanGroup);
    Groups.beforeUpdate(cleanGroup);

    return Groups;
};
