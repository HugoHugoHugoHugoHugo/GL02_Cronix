import {classifyQuestion} from './questionClassifier.js';
import { searchQuestion } from './searchQuestion.js';

//Affiche le contenu d'une question mise en forme
//Pour prendre en compte le html, il faut un nouveau parseur
export function displayQuestion(question){
    
    if(question.text===null){
        console.log("question vide ! ");
    }else{
        const symbolToDelele=["[html]","<i>","</i>","<br>","<b>","</b>"];
    for(let i=0;i<symbolToDelele.length;i++){
        if(question.text.includes(symbolToDelele[i])){
        question.text=question.text.replace(symbolToDelele[i],"");
    }
    }
    
    console.log("=============================================================");
    console.log("title : "+question.title);
    console.log("text : "+question.text);
    
    //---utilisation d'un nouveau parseur si il y a besoin d'interpreter un format (ex : html)
    
        let answers=question.answers;
        console.log("Answers : ");
        for(let i=0;i<answers.length;i++){
            let lineDisplayed="";
            for(let indexChar=0;indexChar<answers[i].length;indexChar++){
                if(answers[i][indexChar]!=="{" && answers[i][indexChar]!=="}" ){
                if(answers[i][indexChar]==="~" && !(answers[i].includes("1:MC:")) && !(answers[i].includes("1:SA:"))){
                    if(answers[i][indexChar+1]!=="="){
                        lineDisplayed+="\nFAUX :";
                    }
                    
                }
                else if((answers[i][indexChar]==="=")&& !(answers[i].includes("1:MC:"))&& !(answers[i].includes("1:SA:")) && !(answers[i].includes("#"))){
                    lineDisplayed+="\nVRAI :";
                }else if(answers[i].includes("1:MC:")){
                    if(indexChar>4){
                        if(answers[i][indexChar]!=="=" ){
                            if(answers[i][indexChar]==="~"){
                                lineDisplayed+="\npossible answer :"
                            }else{
                                lineDisplayed+=answers[i][indexChar];
                                
                            }
                        }
                    }
                }else if(answers[i].includes("1:SA:")){
                    if(indexChar>4){
                        if(answers[i][indexChar]!=="=" ){
                            if(answers[i][indexChar]==="~"){
                                lineDisplayed+="\npossible answer :"
                            }else{
                                lineDisplayed+=answers[i][indexChar];
                                
                            }
                        }
                    }
                }else if(answers[i].includes("#")){
                    if(answers[i][indexChar]!=="#"){
                        lineDisplayed+=answers[i][indexChar];
                    }else if(indexChar>0){
                        lineDisplayed+=" feedback : ";
                    }
                }
                else{
                    lineDisplayed+=answers[i][indexChar];
                }
            }

        }
        lineDisplayed+="\n";
        console.log(lineDisplayed);
        
    }
    }
    
}
        
        
            
            
        
   

    
    

