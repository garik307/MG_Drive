const filePromises = test.questions.map(async (question) => {
    const files = await File.findAll({
        where: {
            name_used: "test",
            row_id: question.id,
        }
    });
    question.dataValues.files = files;
});

await Promise.all(filePromises);