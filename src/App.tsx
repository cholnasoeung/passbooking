import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
};

function App() {
  const [name, setName] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  const API = "http://localhost:5000/users";

  // READ
  const fetchUsers = async () => {
    const res = await fetch(API);
    const data: User[] = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // CREATE & UPDATE
  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (editId !== null) {
      await fetch(`${API}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditId(null);
    } else {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }

    setName("");
    fetchUsers();
  };

  // DELETE
  const handleDelete = async (id: number) => {
    await fetch(`${API}/${id}`, {
      method: "DELETE",
    });
    fetchUsers();
  };

  // EDIT
  const handleEdit = (user: User) => {
    setName(user.name);
    setEditId(user.id);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>CRUD App 🚀 (TypeScript)</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
      />

      <button onClick={handleSubmit}>
        {editId !== null ? "Update" : "Add"}
      </button>

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.name}
            <button onClick={() => handleEdit(u)}>Edit</button>
            <button onClick={() => handleDelete(u.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;