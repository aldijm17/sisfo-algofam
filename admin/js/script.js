import { db } from './firebase.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const list = document.getElementById("taskList");

async function loadTasks() {
  list.innerHTML = "<tr><td colspan='7'>⏳ Memuat...</td></tr>";
  const snapshot = await getDocs(collection(db, "tugas"));
  list.innerHTML = "";
  snapshot.forEach((d) => {
    const t = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.tugas}</td>
        <td class="wrap-text">${t.deskripsi || "-"}</td>   
        <td>${t.deadline}</td>
        <td>${t.matkul}</td>
        <td>${t.dosen}</td>
        <td class="wrap-text">${t.catatan || "-"}</td>

        <td>
            <button class="status-btn" data-id="${d.id}" data-status="${t.status}">
            ${t.status === "belum" ? "❌ Belum" : "✅ Selesai"}
            </button>
        </td>
        <td>
            <a href="edit.html?id=${d.id}">✏️ Edit</a>
            <button class="delete-btn" data-id="${d.id}">🗑 Hapus</button>
        </td>
    `;
    list.appendChild(tr);
  });

  // toggle status
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      const newStatus = status === "belum" ? "selesai" : "belum";
      await updateDoc(doc(db, "tugas", id), { status: newStatus });
      loadTasks();
    });
  });

  // hapus data
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Yakin hapus tugas ini?")) {
        await deleteDoc(doc(db, "tugas", id));
        loadTasks();
      }
    });
  });
}

loadTasks();
