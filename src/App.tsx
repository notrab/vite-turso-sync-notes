import { useEffect, useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { connect } from "@tursodatabase/sync";

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

var db: any = null;
var syncing = false;

async function exec(sql: string) {
  if (!db) return;
  try {
    await db.exec(sql);
  } catch (error) {
    console.error("Database exec error:", error);
  }
}

async function query(sql: string): Promise<any> {
  if (!db) return [];
  try {
    const result = await (await db.prepare(sql)).all();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Database query error:", error);
    return [];
  }
}

async function sync() {
  if (syncing || !db) return;
  syncing = true;
  try {
    await db.sync();
  } catch (error) {
    console.error("Sync failed:", error);
  } finally {
    syncing = false;
    // Sync again after a random interval (1-3 seconds)
    setTimeout(sync, (1 + Math.random() * 2) * 1000);
  }
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
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

  // Initialize database connection
  const initializeDatabase = async () => {
    try {
      const database = await connect({
        path: ":memory:",
        url: import.meta.env.VITE_TURSO_URL,
        authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
        clientName: "notes-app",
      });

      db = database;
      setIsConnected(true);

      // Start syncing
      sync();

      // Load initial data
      await loadData();
    } catch (error) {
      console.error("Failed to connect to database:", error);
    }
  };

  // Load all data from database
  const loadData = async () => {
    await loadFolders();
    await loadNotes();
  };

  // Load folders from database
  const loadFolders = async () => {
    const result = await query("SELECT * FROM folders ORDER BY created_at");
    setFolders(result);
  };

  // Load notes from database
  const loadNotes = async () => {
    const result = await query("SELECT * FROM notes ORDER BY updated_at DESC");
    setNotes(result);
  };

  const createNote = async (folderId: string) => {
    const noteId = nanoid();
    const now = new Date().toISOString();
    const content = "New Note";

    await exec(
      `INSERT INTO notes (id, folder_id, content, created_at, updated_at) VALUES ('${noteId}', '${folderId}', '${content}', '${now}', '${now}')`,
    );

    await loadNotes();
    setSelectedNoteId(noteId);
    setNoteContent(content);
  };

  const saveNoteContent = async (noteId: string, content: string) => {
    const now = new Date().toISOString();
    const escapedContent = content.replace(/'/g, "''"); // Escape single quotes for SQL

    await exec(
      `UPDATE notes SET content = '${escapedContent}', updated_at = '${now}' WHERE id = '${noteId}'`,
    );

    await loadNotes();
  };

  const selectNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setSelectedNoteId(noteId);
      setNoteContent(note.content);
    }
  };

  const deleteNote = async (noteId: string) => {
    await exec(`DELETE FROM notes WHERE id = '${noteId}'`);

    await loadNotes();

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
    // Ensure notes is always an array
    const notesArray = Array.isArray(notes) ? notes : [];

    if (selectedFolderId === "all") {
      return [...notesArray].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    }
    return notesArray
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
    initializeDatabase();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Periodic data refresh to show synced changes
  useEffect(() => {
    if (!db) return;

    const refreshInterval = setInterval(async () => {
      if (!syncing) {
        await loadData();
      }
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(refreshInterval);
  }, [db]);

  const filteredNotes = getFilteredNotes();

  if (!isConnected) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-xl mb-2">Connecting to database...</p>
          <p className="text-gray-400">Please wait while we sync your notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Folders Sidebar */}
      <div className="w-64 bg-gray-200 border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-300">
          <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
          <div className="flex items-center mt-2">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${syncing ? "bg-orange-500" : "bg-green-500"}`}
            ></div>
            <span className="text-xs text-gray-600">
              {syncing ? "Syncing..." : "Online"}
            </span>
          </div>
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
                {Array.isArray(notes) ? notes.length : 0}
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
                  {Array.isArray(notes)
                    ? notes.filter((n) => n.folder_id === folder.id).length
                    : 0}
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
