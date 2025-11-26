import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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

export default function StatsScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

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
    const dateString = format(targetDate, 'yyyy-MM-dd');
    
    if (!task.recurrence && task.date === dateString) {
      return true;
    }

    if (task.recurrence) {
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

  const today = new Date();
  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Calcular total de tarefas considerando recorrência
  const getAllTasksForPeriod = () => {
    const allTasks: Task[] = [];
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, i));
    
    last30Days.forEach(date => {
      tasks.forEach(task => {
        if (shouldShowTask(task, date)) {
          allTasks.push({...task, date: format(date, 'yyyy-MM-dd')});
        }
      });
    });
    
    return allTasks;
  };

  const allPeriodTasks = getAllTasksForPeriod();
  const totalTasks = allPeriodTasks.length;
  const completedTasks = allPeriodTasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayDate = format(today, 'yyyy-MM-dd');
  const todayTasks = tasks.filter(task => shouldShowTask(task, today));
  const todayCompleted = todayTasks.filter(t => t.completed).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  const weeklyData = last7Days.map(day => {
    const dayTasks = tasks.filter(task => shouldShowTask(task, day));
    const dayCompleted = dayTasks.filter(t => t.completed).length;
    return {
      date: day,
      total: dayTasks.length,
      completed: dayCompleted,
      percentage: dayTasks.length > 0 ? (dayCompleted / dayTasks.length) * 100 : 0,
    };
  });

  const maxTasks = Math.max(...weeklyData.map(d => d.total), 1);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.headerTitle}>Estatísticas</Text>
          <Text style={styles.headerSubtitle}>Seu progresso</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={styles.statsGrid}
          entering={FadeInDown.delay(200).springify()}
        >
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Taxa de Conclusão</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="list" size={32} color="#667eea" />
            <Text style={[styles.statValue, styles.statValueDark]}>{totalTasks}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Total de Tarefas</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#667eea" />
            <Text style={[styles.statValue, styles.statValueDark]}>{completedTasks}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Concluídas</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="today" size={32} color="#667eea" />
            <Text style={[styles.statValue, styles.statValueDark]}>{todayCompleted}/{todayTasks.length}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Hoje</Text>
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(400).springify()}
        >
          <Text style={styles.sectionTitle}>Últimos 7 Dias</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {weeklyData.map((day, index) => (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View style={[
                      styles.bar,
                      { height: `${(day.total / maxTasks) * 100}%` }
                    ]}>
                      <View style={[
                        styles.barFilled,
                        { height: `${day.percentage}%` }
                      ]} />
                    </View>
                  </View>
                  <Text style={styles.chartLabel}>
                    {format(day.date, 'EEE', { locale: ptBR })[0]}
                  </Text>
                  <Text style={styles.chartValue}>{day.completed}/{day.total}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          style={styles.section}
          entering={FadeInDown.delay(600).springify()}
        >
          <Text style={styles.sectionTitle}>Conquistas</Text>
          <View style={styles.achievementCard}>
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, completionRate >= 50 && styles.achievementIconActive]}>
                <Ionicons 
                  name="flame" 
                  size={24} 
                  color={completionRate >= 50 ? '#ff6b6b' : '#ccc'} 
                />
              </View>
              <Text style={styles.achievementText}>Sequência de 50%</Text>
            </View>
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, completedTasks >= 10 && styles.achievementIconActive]}>
                <Ionicons 
                  name="star" 
                  size={24} 
                  color={completedTasks >= 10 ? '#ffd700' : '#ccc'} 
                />
              </View>
              <Text style={styles.achievementText}>10 Tarefas Concluídas</Text>
            </View>
            <View style={styles.achievement}>
              <View style={[styles.achievementIcon, completionRate >= 80 && styles.achievementIconActive]}>
                <Ionicons 
                  name="rocket" 
                  size={24} 
                  color={completionRate >= 80 ? '#667eea' : '#ccc'} 
                />
              </View>
              <Text style={styles.achievementText}>Produtividade Alta</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardPrimary: {
    backgroundColor: '#667eea',
    width: '100%',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  statValueDark: {
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  statLabelDark: {
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barContainer: {
    width: 30,
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    minHeight: 4,
  },
  barFilled: {
    width: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  chartLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  chartValue: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  achievementCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementIconActive: {
    backgroundColor: '#f0f4ff',
  },
  achievementText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});