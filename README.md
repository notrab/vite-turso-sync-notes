# Notes App - Apple Notes Clone

A simple Apple Notes clone built with React, TypeScript, Vite, and Tailwind CSS. Features a three-column layout with folders, notes list, and note editor.

## Features

- 📁 **Folder Organization**: Notes are organized into folders (Home, Work, Kids)
- 📝 **Real-time Editing**: Notes auto-save with 300ms debounce
- 🔍 **Smart Previews**: Note titles from first line, preview from remaining content
- 📅 **Smart Timestamps**: Shows relative time (today, yesterday, weekday, date)
- 🗑️ **Easy Management**: Create and delete notes with simple controls
- 💾 **Local Storage**: Currently uses localStorage (ready for Turso database integration)

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd vite-turso-sync
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Usage

### Creating Notes

- Click the "+" New button in the notes list header
- Notes are created in the currently selected folder
- Start typing to edit the note content

### Organizing Notes

- Use the sidebar to switch between folders
- "All Notes" shows notes from all folders
- Each folder shows a count of notes it contains

### Editing Notes

- Click any note in the list to open it in the editor
- Changes are automatically saved after 300ms of inactivity
- The first line becomes the note title
- Remaining content appears as preview in the notes list

### Deleting Notes

- Click the "×" button on any note in the list
- Deletion is immediate and cannot be undone

## Database Integration

The app is currently set up to use localStorage for demonstration purposes. To integrate with Turso database:

1. Set up your environment variables:

```bash
cp .env.example .env
# Edit .env with your Turso credentials
```

2. Uncomment the Turso database code in `src/App.tsx`
3. Replace localStorage functions with database operations

## Project Structure

```
src/
├── App.tsx          # Main application component
├── main.tsx         # React entry point
└── vite-env.d.ts    # TypeScript declarations
```

## Technologies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Turso**: Database (ready for integration)
- **nanoid**: Unique ID generation

## Development

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Preview Production Build

```bash
npm run preview
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
