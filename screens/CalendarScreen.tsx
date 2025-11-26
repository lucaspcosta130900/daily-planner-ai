import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../src/context/TaskContext';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import TaskItem from '../components/TaskItem';

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

export default function CalendarScreen() {
  const { tasks, toggleTask, deleteTask } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Atualiza quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      // Tasks já estão sincronizadas via context
    }, [])
  );

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  };

  const shouldShowTask = (task: Task, targetDate: Date): boolean => {
    // Cria data local do task
    const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
    const taskDate = new Date(taskYear, taskMonth - 1, taskDay);
    
    // Normaliza as datas
    taskDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
  
    if (!task.recurrence && taskDate.getTime() === targetDate.getTime()) {
      return true;
    }
  
    if (task.recurrence) {
      if (targetDate < taskDate) {
        return false;
      }
  
      if (task.recurrence.endDate) {
        const [endYear, endMonth, endDay] = task.recurrence.endDate.split('-').map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        endDate.setHours(23, 59, 59, 999);
        if (targetDate > endDate) {
          return false;
        }
      }
  
      if (task.recurrence.type === 'daily') {
        return true;
      }
  
      if (task.recurrence.type === 'weekly' && task.recurrence.daysOfWeek) {
        const dayOfWeek = targetDate.getDay();
        return task.recurrence.daysOfWeek.includes(dayOfWeek);
      }
  
      if (task.recurrence.type === 'monthly' && task.recurrence.dayOfMonth) {
        return targetDate.getDate() === task.recurrence.dayOfMonth;
      }
    }
  
    return false;
  };

  const handleToggleTask = (id: string) => {
    toggleTask(id);
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteTask(id),
        },
      ]
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Adiciona dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adiciona os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasTasksOnDate = (date: Date | null) => {
    if (!date) return false;
    return tasks.some(task => shouldShowTask(task, date));
  };

  const days = getDaysInMonth(currentMonth);
  const selectedDateTasks = tasks.filter(task => shouldShowTask(task, selectedDate));

  const monthYear = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateFormatted = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.headerTitle}>Calendário</Text>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <View style={styles.calendar}>
        <View style={styles.weekDays}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
            <View key={index} style={styles.weekDayContainer}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dayContainer}
              onPress={() => day && setSelectedDate(day)}
              disabled={!day}
            >
              {day ? (
                <View
                  style={[
                    styles.dayButton,
                    isToday(day) && styles.today,
                    isSelected(day) && styles.selected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday(day) && styles.todayText,
                      isSelected(day) && styles.selectedText,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {hasTasksOnDate(day) && !isSelected(day) && (
                    <View style={styles.taskDot} />
                  )}
                </View>
              ) : (
                <View style={styles.dayButton} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tasksSection}>
        <Text style={styles.tasksSectionTitle}>{selectedDateFormatted}</Text>
        <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
          {selectedDateTasks.length === 0 ? (
            <Animated.View
              style={styles.emptyState}
              entering={FadeIn.delay(300).duration(600)}
            >
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma tarefa neste dia</Text>
            </Animated.View>
          ) : (
            selectedDateTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  calendar: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  today: {
    backgroundColor: '#e8eaf6',
  },
  todayText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  selected: {
    backgroundColor: '#667eea',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#667eea',
    marginTop: 2,
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tasksSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  tasksList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
});