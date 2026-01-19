module.exports = (con, DataTypes) => {
    const Reviews = con.define('reviews', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: { type: DataTypes.STRING },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false
        }
    });
    return Reviews;
};
