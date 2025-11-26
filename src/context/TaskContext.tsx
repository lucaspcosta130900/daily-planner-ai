import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  date: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
  };
}

interface TaskContextType {
  tasks: Task[];
  loadTasks: () => Promise<void>;
  saveTasks: (tasks: Task[]) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  }, []);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.error('Erro ao salvar tarefas:', error);
    }
  }, []);

  const addTask = useCallback(async (task: Task) => {
    const newTasks = [...tasks, task];
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const newTasks = tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    );
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const newTasks = tasks.filter(task => task.id !== id);
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const toggleTask = useCallback(async (id: string) => {
    const newTasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    await saveTasks(newTasks);
  }, [tasks, saveTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loadTasks,
        saveTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}