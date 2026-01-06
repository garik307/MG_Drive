module.exports = (sequelize, DataTypes) => {
    const GroupProgress = sequelize.define('GroupProgress', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        answers: {
            type: DataTypes.TEXT, // Using TEXT to store JSON string
            allowNull: true,
            defaultValue: '{}',
            get() {
                const rawValue = this.getDataValue('answers');
                try {
                    return JSON.parse(rawValue || '{}');
                } catch (e) {
                    return {};
                }
            },
            set(value) {
                this.setDataValue('answers', JSON.stringify(value));
            }
        }
    }, {
        tableName: 'group_progress',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId', 'groupId']
            }
        ]
    });
    return GroupProgress;
};
