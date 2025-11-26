
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';

interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  completed: boolean;
}

interface DatabaseContextType {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id'>) => Promise<void>;
  toggleActivity: (id: number) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  getTodayActivities: () => Activity[];
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.WebSQLDatabase | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const initDB = async () => {
      const database = SQLite.openDatabase('planner.db');
      
      database.transaction(tx => {
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            completed INTEGER DEFAULT 0
          );
        `);
      });

      setDb(database);
      loadActivities(database);
    };

    initDB();
  }, []);

  const loadActivities = (database: SQLite.WebSQLDatabase) => {
    database.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM activities ORDER BY date, time',
        [],
        (_, { rows }) => {
          const result: Activity[] = rows._array;
          setActivities(result);
        }
      );
    });
  };

  const addActivity = (activity: Omit<Activity, 'id'>) => {
    if (!db) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO activities (title, description, date, time, completed) VALUES (?, ?, ?, ?, ?)',
          [activity.title, activity.description, activity.date, activity.time, activity.completed ? 1 : 0],
          () => {
            loadActivities(db);
            resolve();
          }
        );
      });
    });
  };

  const toggleActivity = (id: number) => {
    if (!db) return Promise.resolve();
    
    const activity = activities.find(a => a.id === id);
    if (!activity) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE activities SET completed = ? WHERE id = ?',
          [activity.completed ? 0 : 1, id],
          () => {
            loadActivities(db);
            resolve();
          }
        );
      });
    });
  };

  const deleteActivity = (id: number) => {
    if (!db) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM activities WHERE id = ?',
          [id],
          () => {
            loadActivities(db);
            resolve();
          }
        );
      });
    });
  };

  const getTodayActivities = () => {
    const today = new Date().toISOString().split('T')[0];
    return activities.filter(a => a.date === today);
  };

  return (
    <DatabaseContext.Provider value={{ activities, addActivity, toggleActivity, deleteActivity, getTodayActivities }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within DatabaseProvider');
  return context;
};