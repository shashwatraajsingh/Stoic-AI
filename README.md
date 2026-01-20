# 🏛️ The Stoic AI

A calm voice in a noisy world. Speak. Reflect. Become still.

The Stoic AI is a conversational AI assistant that embodies the wisdom of ancient Stoic philosophers (Marcus Aurelius, Seneca, and Epictetus) to help modern users find clarity, strength, and reason in their daily challenges.

## Features

- **Conversation Mode**: Receive brief (2-5 sentence) Stoic reflections on your thoughts and emotions
- **Guidance Mode**: Get structured philosophical analysis of life dilemmas with ancient insights
- **Daily Reflection**: Generate a brief Stoic meditation to start your day
- **Ancient Aesthetic**: Interface designed to evoke the feel of ancient philosophical manuscripts

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenAI API key (or Anthropic API key)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stoic-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API key to `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

### Conversation Mode
Type your thoughts, doubts, or emotions and receive brief Stoic wisdom focused on virtue, control, duty, and acceptance.

### Guidance Mode
Click "Seek Guidance" and describe a real-life dilemma. The AI will:
- Identify the philosophical theme (fear, anger, indecision, etc.)
- Provide structured guidance with Stoic reasoning
- Share relevant ancient insights
- Offer modern practical takeaways

### Daily Reflection
Click "Receive Today's Reflection" to get a brief Stoic meditation (2-5 sentences) focusing on a single principle or virtue.

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom ancient aesthetic theme
- **AI**: OpenAI GPT-4 (or Anthropic Claude)
- **State Management**: React Context API

## Design Philosophy

The entire experience feels like an interactive Stoic manuscript — a place to think slowly, not scroll quickly. Every message feels handwritten by an ancient philosopher. Minimalism is sacred: no clutter, no emoji spam, no trendy UI effects. The interface invites stillness and contemplation.

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your `OPENAI_API_KEY` environment variable
4. Deploy

## License

MIT
