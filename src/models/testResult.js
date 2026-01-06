module.exports = (sequelize, DataTypes) => {
    const TestResult = sequelize.define('TestResult', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        testId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        score: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        correct_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        wrong_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        time_spent: {
            type: DataTypes.INTEGER, // in seconds
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING, // 'passed', 'failed'
            defaultValue: 'failed'
        }
    }, {
        tableName: 'test_results',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['testId'] },
            { fields: ['groupId'] },
            { fields: ['createdAt'] }
        ]
    });
    return TestResult;
};
