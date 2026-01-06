const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (con, DataTypes) => {
    const User = con.define('users', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
            unique: true,
            validate: {
                is: /^0\d{8}$/
            }
        },

        address: DataTypes.STRING,
        age: DataTypes.INTEGER,

        role: {
            type: DataTypes.ENUM('user', 'student', 'teacher', 'admin'),
            defaultValue: 'user'
        },

        experience: DataTypes.STRING,
        biography: DataTypes.TEXT,
        specialization: DataTypes.STRING,
        certificates: DataTypes.STRING,
        education: DataTypes.STRING,

        number_of_students: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },

        password: {
            type: DataTypes.STRING,
            allowNull: false
        },

        passwordChangedAt: DataTypes.DATE,
        passwordResetToken: DataTypes.STRING,
        passwordResetExpires: DataTypes.DATE,

        login_token: {
            type: DataTypes.STRING,
            allowNull: true
        },

        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false
        },

        deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        isPaid: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        include_in_analytics: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        paymentExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        defaultScope: {
            where: { deleted: false }
        },

        scopes: {
            withDeleted: {} 
        },
        indexes: [
            { fields: ['role'] },
            { fields: ['isPaid'] },
            { fields: ['deleted'] }
        ],

        hooks: {
            // Hash password only if modified
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 10);
                    user.passwordChangedAt = new Date(Date.now() - 1000);

                    // clear reset token if pass changed
                    user.passwordResetToken = null;
                    user.passwordResetExpires = null;
                }
            }
        }
    });

    // ------- INSTANCE METHODS -------

    User.prototype.correctPassword = function (candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    };

    User.prototype.changedPasswordAfter = function (JWTTimestamp) {
        if (!this.passwordChangedAt) return false;

        const changedTS = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTS;
    };

    User.prototype.createPasswordResetToken = function () {
        const resetToken = crypto.randomBytes(32).toString('hex');

        this.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

        return resetToken;
    };

    User.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());
        delete values.password;
        delete values.passwordResetToken;
        delete values.passwordResetExpires;
        delete values.login_token;
        delete values.deleted;
        return values;
    };

    return User;
};
