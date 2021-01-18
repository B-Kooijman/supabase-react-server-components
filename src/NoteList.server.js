// We don't have to import React!

import SidebarNote from './SidebarNote';
import {fetch} from 'react-fetch';

export default function NoteList({searchText}) {
  const serverUrl = `http://localhost:4000/notes` // todo move to env.
  const fetchUrl = searchText?.length <= 2 ? `${serverUrl}` : `${serverUrl}/search/${searchText}`

  const notes = fetch(fetchUrl).json()

  return notes.length > 0 ? (
    <ul className="notes-list">
      {notes.map((note) => (
        <li key={note.id}>
          <SidebarNote note={note} />
        </li>
      ))}
    </ul>
  ) : (
    <div className="notes-empty">
      {searchText
        ? `Couldn't find any notes titled "${searchText}".`
        : 'No notes created yet!'}{' '}
    </div>
  );
}
