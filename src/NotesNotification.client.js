import { useState, useEffect } from 'react';
import { supabase } from '../supabase/init';

// TODO: Only fetches data so convert to server component!!

export default function NotesNotification({lastNote}) {
  const [changedRecord, setChangeRecord] = useState(lastNote);
  
  // Works, but sometimes with delay of 2 minutes, not really realtime... :(
  useEffect(() => {
    // Listen for new notes.
    const updateNoteListener = supabase
      .from('notes')
      .on('INSERT', (payload) => setChangeRecord(payload.new))
      .subscribe();

    return () => {
      updateNoteListener.unsubscribe();
    };
  }, []);

  return (
    changedRecord && 
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
          <p>Last Created: {changedRecord.title}</p>
        </div>
  );
}
