const BASE_URL = 'https://api.polza.ai/v1';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function extractImage(obj){
  if(!obj) return null;
  if(obj.data && obj.data[0]){
    const it=obj.data[0];
    if(it.b64_json) return it.b64_json.startsWith('data:')?it.b64_json:'data:image/png;base64,'+it.b64_json;
    if(it.url) return it.url;
  }
  if(typeof obj.data==='string' && obj.data.length>100){
    return obj.data.startsWith('data:')||obj.data.startsWith('http')?obj.data:'data:image/png;base64,'+obj.data;
  }
  if(obj.url) return obj.url;
  if(obj.image) return obj.image;
  if(obj.b64_json) return obj.b64_json.startsWith('data:')?obj.b64_json:'data:image/png;base64,'+obj.b64_json;
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(200).json({error:'Только POST запросы'});

  try {
    const { prompt } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    
    if(!KEY) return res.status(200).json({error:'Нет POLZA_API_KEY'});
    
    const H = {'Content-Type':'application/json','Authorization':'Bearer '+KEY};

    // Жесткая установка на фотореализм и запрет текста (чтобы не было мультяшек и кривых букв)
    const finalPrompt = prompt + ", photorealistic, cinematic lighting, highly detailed. STRICTLY NO TEXT, no words, no letters, blank background.";

    // Отправляем в нативный эндпоинт /media с правильной структурой input
    const reqBody = { 
      model: 'tongyi-mai/z-image', 
      input: {
          prompt: finalPrompt,
          aspect_ratio: '1:1'
      }
    };

    const r = await fetch(BASE_URL + '/media', {
      method: 'POST', 
      headers: H,
      body: JSON.stringify(reqBody)
    });
    
    const textResponse = await r.text();
    let first;
    try {
        first = JSON.parse(textResponse);
    } catch(e) {
        return res.status(200).json({error: 'Сбой API (не JSON): ' + textResponse.slice(0, 250)});
    }

    let img = extractImage(first);
    if(img) return res.status(200).json({image:img});

    const id = first.id || first.requestId || first.taskId;
    
    if(!id) return res.status(200).json({error:'ОШИБКА-ID: '+JSON.stringify(first).slice(0,700)});

    // Ждем пока картинка сгенерируется
    for(let i=0;i<14;i++){
      await sleep(2000);
      const pr = await fetch(BASE_URL+'/media/'+id, {headers:H});
      const pd = await pr.json();
      img = extractImage(pd);
      if(img) return res.status(200).json({image:img});
      if(pd.status==='failed' || pd.status==='error'){
        return res.status(200).json({error:'ОШИБКА-ГЕНЕРАЦИИ: '+JSON.stringify(pd).slice(0,700)});
      }
      if(i===13){
        return res.status(200).json({error:'ТАЙМАУТ: '+JSON.stringify(pd).slice(0,700)});
      }
    }
  } catch(e) {
    return res.status(200).json({error:'СБОЙ-КОДА: '+String(e)});
  }
};
