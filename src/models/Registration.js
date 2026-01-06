// models/registrations.js
module.exports = (con, DataTypes) => {
    const Registration = con.define('registrations', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastname: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        packageType: {
            type: DataTypes.ENUM('տեսական', 'գործնական', 'ֆուլ փաթեթ'),
            allowNull: false,
            defaultValue: 'տեսական'
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false
        }
    });

    return Registration;
}
