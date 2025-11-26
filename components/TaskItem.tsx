import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  date: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
  };
}

interface TaskItemProps {
  task: Task;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, index, onToggle, onDelete }: TaskItemProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (task.completed) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 8 })
      );
      opacity.value = withTiming(0.6, { duration: 300 });
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [task.completed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleToggle = () => {
    onToggle(task.id);
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).springify()}
      exiting={FadeOutLeft.duration(300)}
      style={animatedStyle}
    >
      <View style={styles.taskItem}>
        <TouchableOpacity style={styles.checkbox} onPress={handleToggle}>
          {task.completed ? (
            <Animated.View entering={FadeInRight.springify()}>
              <Ionicons name="checkmark-circle" size={32} color="#667eea" />
            </Animated.View>
          ) : (
            <Ionicons name="ellipse-outline" size={32} color="#ccc" />
          )}
        </TouchableOpacity>

        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskText,
              task.completed && styles.taskTextCompleted,
            ]}
          >
            {task.title}
          </Text>
          
          {task.recurrence && (
            <View style={styles.recurrenceBadge}>
              <Ionicons name="repeat" size={10} color="#667eea" />
              <Text style={styles.recurrenceText}>
                {task.recurrence.type === 'daily' ? 'Diário' : 
                 task.recurrence.type === 'weekly' ? 'Semanal' : 'Mensal'}
              </Text>
            </View>
          )}
          
          {task.completed && (
            <Animated.View
              entering={FadeInRight.delay(200).springify()}
              style={styles.completedBadge}
            >
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.completedText}>Concluída</Text>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onDelete(task.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  completedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  recurrenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  recurrenceText: {
    color: '#667eea',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});