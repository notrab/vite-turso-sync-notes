import { useEffect, useState, useCallback } from "react";
import { nanoid } from "nanoid";

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface Note {
  id: string;
  folder_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");

  // Debounced save function
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback(
    (content: string) => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        if (selectedNoteId) {
          saveNoteContent(selectedNoteId, content);
        }
      }, 300);

      setSaveTimeout(timeout);
    },
    [selectedNoteId, saveTimeout],
  );

  // Initialize folders and load data
  const initializeData = () => {
    // Load folders from localStorage or create defaults
    const storedFolders = localStorage.getItem("notes_folders");
    if (storedFolders) {
      setFolders(JSON.parse(storedFolders));
    } else {
      const defaultFolders: Folder[] = [
        {
          id: "home",
          name: "Home",
          created_at: new Date().toISOString(),
        },
        {
          id: "work",
          name: "Work",
          created_at: new Date().toISOString(),
        },
        {
          id: "kids",
          name: "Kids",
          created_at: new Date().toISOString(),
        },
      ];
      setFolders(defaultFolders);
      localStorage.setItem("notes_folders", JSON.stringify(defaultFolders));
    }

    // Load notes from localStorage
    const storedNotes = localStorage.getItem("notes_notes");
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes));
    }
  };

  const saveNotesToStorage = (notesToSave: Note[]) => {
    localStorage.setItem("notes_notes", JSON.stringify(notesToSave));
    setNotes(notesToSave);
  };

  const createNote = (folderId: string) => {
    const noteId = nanoid();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: noteId,
      folder_id: folderId,
      content: "New Note",
      created_at: now,
      updated_at: now,
    };

    const updatedNotes = [newNote, ...notes];
    saveNotesToStorage(updatedNotes);
    setSelectedNoteId(noteId);
    setNoteContent("New Note");
  };

  const saveNoteContent = (noteId: string, content: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId
        ? { ...note, content, updated_at: new Date().toISOString() }
        : note,
    );
    saveNotesToStorage(updatedNotes);
  };

  const selectNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setSelectedNoteId(noteId);
      setNoteContent(note.content);
    }
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter((note) => note.id !== noteId);
    saveNotesToStorage(updatedNotes);

    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setNoteContent("");
    }
  };

  const handleContentChange = (content: string) => {
    setNoteContent(content);
    if (selectedNoteId) {
      debouncedSave(content);
    }
  };

  const getTitle = (content: string) => {
    const firstLine = content.split("\n")[0].trim();
    return firstLine || "Untitled";
  };

  const getPreview = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    if (lines.length <= 1) {
      return "";
    }
    const preview = lines.slice(1).join(" ").trim();
    return preview.length > 50 ? preview.substring(0, 50) + "..." : preview;
  };

  const getFilteredNotes = () => {
    if (selectedFolderId === "all") {
      return notes.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return notes
      .filter((note) => note.folder_id === selectedFolderId)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const filteredNotes = getFilteredNotes();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Folders Sidebar */}
      <div className="w-64 bg-gray-200 border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-300">
          <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
        </div>
        <div className="flex-1 py-2">
          <button
            onClick={() => setSelectedFolderId("all")}
            className={`w-full text-left px-4 py-3 hover:bg-gray-300 transition-colors ${
              selectedFolderId === "all"
                ? "bg-blue-200 border-r-2 border-blue-500"
                : ""
            }`}
          >
            <div className="flex items-center">
              <span className="text-blue-500 mr-3">📝</span>
              <span className="font-medium">All Notes</span>
              <span className="ml-auto text-sm text-gray-500">
                {notes.length}
              </span>
            </div>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-300 transition-colors ${
                selectedFolderId === folder.id
                  ? "bg-blue-200 border-r-2 border-blue-500"
                  : ""
              }`}
            >
              <div className="flex items-center">
                <span className="text-yellow-500 mr-3">📁</span>
                <span className="font-medium">{folder.name}</span>
                <span className="ml-auto text-sm text-gray-500">
                  {notes.filter((n) => n.folder_id === folder.id).length}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="w-80 bg-white border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-300 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">
            {selectedFolderId === "all"
              ? "All Notes"
              : folders.find((f) => f.id === selectedFolderId)?.name}
          </h2>
          <button
            onClick={() =>
              createNote(selectedFolderId === "all" ? "home" : selectedFolderId)
            }
            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 rounded text-sm font-medium transition-colors"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => selectNote(note.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedNoteId === note.id ? "bg-yellow-100" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {getTitle(note.content)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getPreview(note.content)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {formatDate(note.updated_at)}
                    </p>
                    {selectedFolderId === "all" && (
                      <span className="text-xs text-gray-400">
                        {folders.find((f) => f.id === note.folder_id)?.name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📝</div>
              <p>No notes in this folder</p>
              <button
                onClick={() =>
                  createNote(
                    selectedFolderId === "all" ? "home" : selectedFolderId,
                  )
                }
                className="mt-4 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded text-sm font-medium transition-colors"
              >
                Create your first note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNoteId ? (
          <>
            <div className="p-4 border-b border-gray-300 bg-white">
              <h2 className="text-lg font-medium text-gray-800">
                {getTitle(noteContent)}
              </h2>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 p-4 border-none outline-none resize-none text-sm leading-relaxed"
              placeholder="Start typing your note..."
              style={{
                fontFamily: "SF Pro Text, -apple-system, system-ui, sans-serif",
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-xl mb-2">Select a note to edit</p>
              <p className="text-gray-400">
                Or create a new note to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
