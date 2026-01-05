
export class Test {
    constructor(questions, idUser, name) {
        this.questions = questions;
        this.idUser = idUser;
        this.name = name;


    }
    addQuestion(question) {
        this.questions.push(question);
    }
    deleteQuestion(index) {
        this.questions.splice(index, 1);
    }
}
