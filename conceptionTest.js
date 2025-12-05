
import {Test} from "./Test.js";
import {searchQuestion} from "./searchQuestion.js";
import {displayQuestion} from "./displayQuestion.js"
import readline from "readline";

//Les fonctions async ne doivent pas etre utilisees telles qu'elles, elles contiennent des blocs d'instruction a executer dans le main
export async function createTest(idUser,nameTest){
    //Initialisation
    let testCreated= new Test([],idUser,nameTest);
    //Ajouter des questions
    let continuate=true;
    while(continuate){
        
        let beginning;//a determiner par l'utilisateur
        let content;//a determiner par l'utilisateur
        
        let result =await ask('Rechercher une question en saisissant le titre ?  :\n oui (1) \n non (2)\n');
        if(result===1){
            

            beginning =await ask('Saisissez le titre : ');
        }
        
        result = await ask('Rechercher une question en saisissant une partie du contenu ?  :\n oui (1) \n non (2)\n');
        if(result===1){
            

            beginning =await ask('Saisissez le contenu : ');
        }
        
        let questions=AfficherQuestions(content,beginning);
        let index=0;// a determiner avec une interface lors d'une saisie, indice permettant d'identifier la question
        let question=chooseQuestion(questions,index);
        displayQuestion(question);
        if(acceptQuestion()){
            addQuestion(testCreated,index,questions);
        }
        
        continuate=acceptTest();
            
    }
    if(valider(testCreated)===true){
        console.log("Test ajoute avec succes !");
        return testCreated; 
    }
    
}
function AfficherQuestions(content,beginning){
    let input='data/SujetB_data/';// variable a determiner en fonction de la structure de l'application
    let questions=searchQuestion(content,beginning, input);
    //Affichage des titres et des indices des questions-----------------------
    for(let i=0;i<questions.length;i++){
        for(let j=0;j<questions[i].length;j++){
        console.log("("+i*j+") : "+questions[i][j].title);
    }    
    }
    //------------------------------------------------------------------------
    return questions;
}
function addQuestion(testCreated,index,questions){
    
    
    
    
    
    
    let question=chooseQuestion(questions,index);
    
    //On ajoute la question au test    
    testCreated.addQuestion(question);
    
}
function chooseQuestion(questions,index){
    // Par la suite, au moment de faire des interfaces, on pourra envisager un fonctionnement plus complexe
    
    return questions[index];
}


async function acceptTest() {
    //retourne false si l'utilisateur veut arreter d'ajouter des questions, true sinon
    

    const result =await ask('Terminer la creation du test ? : oui (1) \n non (2)\n');

    if(result===1){
        return false;
    }else{
        return true;
    }


    
}
async function acceptQuestion() {
    //retourne false si l'utilisateur ne veut pas ajouter la question, true sinon
    

    const result =await ask('Ajouter cette question ? : oui (1) \n non (2)\n');

    if(result===1){
        return true;
    }else{
        return false;
    }


    
}
function valider(testCreated,numberMaxQuestions){
    //On verifie que le nombre de questions ne depasse pas le maximum autorise
    if(verifierNombreQuestions(testCreated,numberMaxQuestions)===false){
        console.log("Le nombre de questions doit etre inferieur a 20");
        return false;
    }
    
    //On verifie qu'il n'y a pas 2 fois la meme question
    if(verifierDifferenceQuestions(testCreated)===false){
        console.log("Les questions doivent etre toutes differentes");
        return false;
    }
    //Ecrire le test dans un fichier et renvoyer true
    ecrireTestFichier(testCreated);
    return true
    
    }

function verifierNombreQuestions(testCreated,numberMaxQuestions){
    if(testCreated.questions.length>numberMaxQuestions){
        return false;
    }
}
function verifierDifferenceQuestions(testCreated){
    for(let i=0;i<testCreated.questions.length;i++){
            let questionATester=testCreated.questions[i];
            for(let indexQuestions=0;indexQuestions<testCreated.questions.length;indexQuestions++){
                if(i!==indexQuestions){
                    if(questionATester.title===testCreated.questions[indexQuestions].title){
                        return false;
                    }
                }
            }
        }
}

function ecrireTestFichier(testCreated){
    
}
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}