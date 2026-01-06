module.exports = (con, DataTypes) => {
    const Question = con.define('questions', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        row_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        question: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        correctAnswerIndex: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        options: {
            type: DataTypes.JSON(),
            allowNull: true
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: con.literal("CURRENT_TIMESTAMP"),
            allowNull: false
        }
    }, {
        indexes: [
            {
                name: 'questions_row_id_table_name_index',
                fields: ['row_id', 'table_name']
            }
        ]
    });
    return Question;
}
