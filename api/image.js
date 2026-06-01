const BASE_URL  = 'https://api.polza.ai/v1';
const IMG_MODEL = 'tongyi-mai/z-image';
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
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});

  try{
    const { prompt } = req.body;
    const KEY = process.env.POLZA_API_KEY;
    if(!KEY) return res.status(200).json({error:'нет POLZA_API_KEY'});
    const H = {'Content-Type':'application/json','Authorization':'Bearer '+KEY};

    const r = await fetch(BASE_URL+'/images/generations',{
      method:'POST', headers:H,
      body:JSON.stringify({ model:IMG_MODEL, prompt:'Motivational illustration, no text: '+prompt, n:1, size:'1024x1024' })
    });
    const first = await r.json();

    let img = extractImage(first);
    if(img) return res.status(200).json({image:img});

    const id = first.id || first.requestId || first.taskId;
    if(!id) return res.status(200).json({error:'ДИАГНОЗ-1 (нет id): '+JSON.stringify(first).slice(0,700)});

    for(let i=0;i<14;i++){
      await sleep(2000);
      const pr = await fetch(BASE_URL+'/media/'+id,{headers:H});
      const pd = await pr.json();
      img = extractImage(pd);
      if(img) return res.status(200).json({image:img});
      if(pd.status==='failed' || pd.status==='error'){
        return res.status(200).json({error:'ДИАГНОЗ-2 (статус): '+JSON.stringify(pd).slice(0,700)});
      }
      if(i===13){
        return res.status(200).json({error:'ДИАГНОЗ-3 (последний ответ): '+JSON.stringify(pd).slice(0,700)});
      }
    }
  }catch(e){
    return res.status(500).json({error:'ДИАГНОЗ-4 (исключение): '+String(e)});
  }
};
