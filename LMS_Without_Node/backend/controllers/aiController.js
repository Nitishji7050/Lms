const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.chatWithAI = async (req, res) => {
  try {
    const { message, context } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful educational assistant. Answer questions clearly and provide explanations."
        },
        ...(context || []),
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500
    });

    res.json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
};

exports.generateTestFromPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);

    const prompt = `Based on the following PDF content, generate 10 multiple choice questions with 4 options each. Format as JSON:
{
  "questions": [
    {
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": 0
    }
  ]
}

PDF Content:
${pdfData.text.substring(0, 3000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const responseText = completion.choices[0].message.content;
    let questions;
    
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      questions = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      // If parsing fails, return raw response
      questions = { questions: [], rawResponse: responseText };
    }

    res.json(questions);
  } catch (error) {
    console.error('PDF Test Generation Error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error generating test', error: error.message });
  }
};
