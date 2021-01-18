import {fetch} from 'react-fetch';
import NotesNotification from './NotesNotification.client';

export default function NotesCounter() {
  const notes = fetch('http://localhost:4000/notes').json();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
      <table>
        <tbody>
          <tr>
            <td>Total number of notes:</td>
            <td>
              <pre>{notes.length}</pre>
            </td>
          </tr>
          <tr>
            <td>Notes edited today:</td>
            <td>
              <pre>
                {notes.filter(note => 
                    new Date(note.updatedAt).toDateString() == new Date().toDateString()).length}
              </pre>
            </td>
          </tr>
        </tbody>
      </table>
      <NotesNotification lastNote={notes[notes.length - 1]}/>
    </div>
  );
}
