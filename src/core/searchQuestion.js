
import { parseGiftFile } from "./giftParserForConceptionTest.js";
import fs from "fs";
import path from "path";
export function searchQuestion(content, beginning,input){
    const giftFiles = [];

  // Collecte des fichiers
 
    const stat = fs.statSync(input);

    if (stat.isDirectory()) {
      const files = fs.readdirSync(input)
        .filter(f => f.endsWith(".gift"))
        .map(f => path.join(input, f));
      giftFiles.push(...files);
    } else if (input.endsWith(".gift")) {
      giftFiles.push(input);
    }
  
  //lecture et tri des questions
  let questions=[];
  for(const file of giftFiles){
    if(beginning!="" && beginning!=null && content!="" && content!=null){
        let q_temp= parseGiftFile(file).filter(q=>{q.title.startsWith(beginning) && q.text.includes(content)});
        if(q_temp.length!=0){
            questions.push(q_temp);
        }
    }else
    if(beginning!="" && beginning!=null){
        let q_temp= parseGiftFile(file).filter(q=>q.title.startsWith(beginning));
        if(q_temp.length!=0){
            questions.push(q_temp);
        }
         
    }else
    if(content!="" && content!=null){
         let q_temp=parseGiftFile(file).filter(q=>(q.text.includes(content)))
         if(q_temp.length!=0){
            questions.push(q_temp);
        }
        
    }
    
    
    
    
  }
  if(questions.length===0 && (beginning==="" || beginning===null &&(content==="" || content===null))){
    for(const file of giftFiles){
        questions.push(parseGiftFile(file));
    }
  }
  return questions;
}
