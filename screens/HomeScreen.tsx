import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTasks } from '../src/context/TaskContext';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AIService } from '../services/aiService';
import TaskItem from '../components/TaskItem';
import ChatModal from '../components/ChatModal';

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

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  role?: 'system' | 'user' | 'assistant';
}

export default function HomeScreen() {
  const { tasks, toggleTask, deleteTask, addTask } = useTasks();
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Atualiza quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      // Tasks já estão sincronizadas via context
    }, [])
  );

  const shouldShowTask = (task: Task, targetDate: string): boolean => {
    // Cria datas locais sem conversão UTC
    const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
    const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
    
    const taskDate = new Date(taskYear, taskMonth - 1, taskDay);
    const target = new Date(targetYear, targetMonth - 1, targetDay);
    
    taskDate.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
  
    if (!task.recurrence && taskDate.getTime() === target.getTime()) {
      return true;
    }
  
    if (task.recurrence) {
      if (target < taskDate) {
        return false;
      }
  
      if (task.recurrence.endDate) {
        const [endYear, endMonth, endDay] = task.recurrence.endDate.split('-').map(Number);
        const endDate = new Date(endYear, endMonth - 1, endDay);
        endDate.setHours(23, 59, 59, 999);
        if (target > endDate) {
          return false;
        }
      }
  
      if (task.recurrence.type === 'daily') {
        return true;
      }
  
      if (task.recurrence.type === 'weekly' && task.recurrence.daysOfWeek) {
        const dayOfWeek = target.getDay();
        return task.recurrence.daysOfWeek.includes(dayOfWeek);
      }
  
      if (task.recurrence.type === 'monthly' && task.recurrence.dayOfMonth) {
        return target.getDate() === task.recurrence.dayOfMonth;
      }
    }
  
    return false;
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

  const addTaskFromAI = async (
    taskTitle: string,
    date?: string,
    recurrence?: Task['recurrence']
  ) => {
    let taskDate: string;
  
    if (date === 'TOMORROW') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      taskDate = `${year}-${month}-${day}`;
    } else if (date === 'TODAY' || !date) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      taskDate = `${year}-${month}-${day}`;
    } else {
      taskDate = date;
    }
  
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle,
      completed: false,
      createdAt: new Date().toISOString(),
      date: taskDate,
      recurrence: recurrence,
    };
  
    await addTask(newTask);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      role: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role || (msg.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text,
      }));

      const aiResponse = await AIService.sendMessage(currentInput, conversationHistory);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        isUser: false,
        role: 'assistant',
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (aiResponse.task) {
        addTaskFromAI(aiResponse.task, aiResponse.date, aiResponse.recurrence);
      }
    } catch (error) {
      console.error('Erro:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro. Verifique sua configuração.',
        isUser: false,
        role: 'assistant',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(task => shouldShowTask(task, today));
  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.headerTitle}>Hoje</Text>
          <Text style={styles.headerDate}>{formattedDate}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: `${completionPercentage}%` }
                ]}
                entering={SlideInRight.duration(800)}
              />
            </View>
            <Text style={styles.statsText}>
              {completedCount}/{totalCount} concluídas
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {todayTasks.length === 0 ? (
          <Animated.View 
            style={styles.emptyState}
            entering={FadeIn.delay(300).duration(600)}
          >
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma tarefa para hoje</Text>
            <Text style={styles.emptySubtext}>Use a IA para adicionar tarefas</Text>
          </Animated.View>
        ) : (
          todayTasks.map((task, index) => (
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

      <Animated.View entering={ZoomIn.delay(400)}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowChat(!showChat)}
        >
          <Ionicons name={showChat ? 'close' : 'chatbubble-ellipses'} size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <ChatModal
        visible={showChat}
        messages={messages}
        inputMessage={inputMessage}
        isLoading={isLoading}
        onChangeText={setInputMessage}
        onSend={sendMessage}
        onClose={() => setShowChat(false)}
      />
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerDate: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  taskList: {
    flex: 1,
    padding: 16,
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
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});