module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { prompt } = req.body;
    
    // Передаем точный запрос ИИ, требуя высокое качество
    const encodedPrompt = encodeURIComponent(prompt + ', highly detailed, 4k, no text');
    const randomSeed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&seed=${randomSeed}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
      const imageResponse = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!imageResponse.ok) throw new Error('Pollinations overload');

      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      return res.status(200).json({ image: 'data:image/jpeg;base64,' + base64 });

    } catch (fetchError) {
      // Запасные картинки на случай долгого ответа нейросети
      const fallbackImages = [
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800',
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800',
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800'
      ];
      const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
      return res.status(200).json({ image: randomImage });
    }
    
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
