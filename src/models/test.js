// models/Test.js
module.exports = (con, DataTypes) => {
    const Test = con.define('tests', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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

        slug: DataTypes.STRING,
    }, {
        timestamps: true,
        indexes: [
            { fields: ['number'] },
            { fields: ['slug'] }
        ]
    });

    const extractNumber = (test) => {
        // find first number
        const match = test.title.match(/\d+/);
        const num = match ? parseInt(match[0]) : 0;

        test.number = num;

        // remove JUST THAT number from text
        if (match) {
            test.title = test.title.replace(match[0], '').trim();
        }

        // generate slug
        test.slug = test.title.toLowerCase().replace(/\s+/g, '-');
    };

    Test.beforeCreate(extractNumber);
    Test.beforeUpdate(extractNumber);

    return Test;
};