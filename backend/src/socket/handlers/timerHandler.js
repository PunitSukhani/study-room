import Room from '../../models/Room.js';

/**
 * Socket Timer Handler
 * 
 * Manages real-time timer functionality for rooms including:
 * - Starting, pausing, and resetting timers
 * - Changing timer modes (focus, short break, long break)
 * - Host-only timer control validation
 * - Real-time timer state synchronization
 * - Timer completion handling
 * 
 * Timer modes:
 * - focus: Main study session
 * - shortBreak: Brief break between sessions
 * - longBreak: Extended break after multiple sessions
 * 
 * Only the room host can control the timer. All timer state changes
 * are broadcast to all room members in real-time.
 */

/**
 * Calculate current timer state based on elapsed time
 * Used to sync timer display across all clients
 * @param {Object} timerState - Timer state from database
 * @returns {Object} Updated timer state with current time remaining
 */
const calculateCurrentTimerState = (timerState) => {
  if (!timerState.isRunning || !timerState.startedAt) {
    return timerState;
  }
  
  const now = new Date();
  const startedAt = new Date(timerState.startedAt);
  const elapsedSeconds = Math.floor((now - startedAt) / 1000);
  const currentTimeRemaining = Math.max(0, timerState.timeRemaining - elapsedSeconds);
  
  return {
    ...timerState,
    timeRemaining: currentTimeRemaining
  };
};

// Helper to check if user is the host
/**
 * Check if user is the host of the room
 * @param {Object} room - Room document
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is the host
 */
const isUserHost = (room, userId) => {
  return room.host.toString() === userId.toString();
};

/**
 * Handle timer start request
 * Only room host can start the timer
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Client socket requesting timer start
 * @param {Object} data - Request data containing roomId
 * @param {string} data.roomId - ID of the room to start timer for
 */
export const handleStartTimer = async (io, socket, { roomId }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Only host can control timer
    if (!isUserHost(room, socket.user.id)) {
      socket.emit('error', { message: 'Only host can control timer' });
      return;
    }
    
    // Update timer state
    room.timerState.isRunning = true;
    room.timerState.startedAt = new Date();
    await room.save();
    
    console.log(`[Timer] Started timer for room ${roomId} - Mode: ${room.timerState.mode}, Time: ${room.timerState.timeRemaining}s`);
    
    // Broadcast timer state to room
    io.to(roomId).emit('timer-started', room.timerState);
  } catch (error) {
    console.error('Error starting timer:', error);
    socket.emit('error', { message: 'Failed to start timer' });
  }
};

export const handlePauseTimer = async (io, socket, { roomId, timeRemaining }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Only host can control timer
    if (!isUserHost(room, socket.user.id)) {
      socket.emit('error', { message: 'Only host can control timer' });
      return;
    }
    
    // Calculate current time remaining if timer was running
    let currentTimeRemaining = timeRemaining;
    if (room.timerState.isRunning && room.timerState.startedAt) {
      const currentTimerState = calculateCurrentTimerState(room.timerState);
      currentTimeRemaining = Math.min(currentTimeRemaining || room.timerState.timeRemaining, currentTimerState.timeRemaining);
    }
    
    // Update timer state
    room.timerState.isRunning = false;
    room.timerState.timeRemaining = Math.max(0, currentTimeRemaining);
    room.timerState.pausedAt = new Date();
    room.timerState.startedAt = null; // Clear startedAt when paused
    await room.save();
    
    console.log(`[Timer] Paused timer for room ${roomId} - Time remaining: ${room.timerState.timeRemaining}s`);
    
    // Broadcast timer state to room
    io.to(roomId).emit('timer-paused', room.timerState);
  } catch (error) {
    console.error('Error pausing timer:', error);
    socket.emit('error', { message: 'Failed to pause timer' });
  }
};

export const handleResetTimer = async (io, socket, { roomId }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Only host can control timer
    if (!isUserHost(room, socket.user.id)) {
      socket.emit('error', { message: 'Only host can control timer' });
      return;
    }
    
    // Update timer state based on current mode using room's custom settings
    const timeByMode = {
      focus: room.timerSettings?.focusDuration || 25 * 60,
      shortBreak: room.timerSettings?.shortBreakDuration || 5 * 60,
      longBreak: room.timerSettings?.longBreakDuration || 15 * 60
    };
    
    room.timerState.timeRemaining = timeByMode[room.timerState.mode] || timeByMode.focus;
    room.timerState.isRunning = false;
    room.timerState.startedAt = null;
    room.timerState.pausedAt = null;
    await room.save();
    
    console.log(`[Timer] Reset timer for room ${roomId} - Mode: ${room.timerState.mode}, Time: ${room.timerState.timeRemaining}s`);
    
    // Broadcast timer state to room
    io.to(roomId).emit('timer-reset', room.timerState);
  } catch (error) {
    console.error('Error resetting timer:', error);
    socket.emit('error', { message: 'Failed to reset timer' });
  }
};

export const handleChangeTimerMode = async (io, socket, { roomId, mode }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Only host can control timer
    if (!isUserHost(room, socket.user.id)) {
      socket.emit('error', { message: 'Only host can control timer' });
      return;
    }
    
    // Validate mode
    const validModes = ['focus', 'shortBreak', 'longBreak'];
    if (!validModes.includes(mode)) {
      socket.emit('error', { message: 'Invalid timer mode' });
      return;
    }
    
    // Update timer state based on mode using room's custom settings
    room.timerState.mode = mode;
    room.timerState.isRunning = false;
    room.timerState.startedAt = null;
    room.timerState.pausedAt = null;
    
    const timeByMode = {
      focus: room.timerSettings?.focusDuration || 25 * 60,
      shortBreak: room.timerSettings?.shortBreakDuration || 5 * 60,
      longBreak: room.timerSettings?.longBreakDuration || 15 * 60
    };
    
    room.timerState.timeRemaining = timeByMode[mode];
    
    // Increment cycle count if switching from focus to break
    if (mode !== 'focus' && room.timerState.mode === 'focus') {
      room.timerState.cycleCount++;
    }
    
    await room.save();
    
    console.log(`[Timer] Changed mode for room ${roomId} to ${mode} - Time: ${room.timerState.timeRemaining}s, Cycle: ${room.timerState.cycleCount}`);
    
    // Broadcast timer state to room
    io.to(roomId).emit('timer-mode-changed', room.timerState);
  } catch (error) {
    console.error('Error changing timer mode:', error);
    socket.emit('error', { message: 'Failed to change timer mode' });
  }
};

// Handle timer completion (called from frontend)
export const handleTimerCompleted = async (io, socket, { roomId }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Only host can trigger completion
    if (!isUserHost(room, socket.user.id)) {
      socket.emit('error', { message: 'Only host can control timer' });
      return;
    }
    
    console.log(`[Timer] Timer completed for room ${roomId} - Mode: ${room.timerState.mode}`);
    
    // Stop the timer
    room.timerState.isRunning = false;
    room.timerState.timeRemaining = 0;
    room.timerState.startedAt = null;
    room.timerState.pausedAt = null;
    
    // Auto-suggest next mode based on Pomodoro technique
    let suggestedNextMode = 'shortBreak';
    if (room.timerState.mode === 'focus') {
      // After focus session, suggest break
      suggestedNextMode = (room.timerState.cycleCount % 4 === 3) ? 'longBreak' : 'shortBreak';
      room.timerState.cycleCount++;
    } else {
      // After break, suggest focus
      suggestedNextMode = 'focus';
    }
    
    await room.save();
    
    // Broadcast completion to room
    io.to(roomId).emit('timer-completed', {
      completedMode: room.timerState.mode,
      suggestedNextMode,
      cycleCount: room.timerState.cycleCount,
      timerState: room.timerState
    });
    
  } catch (error) {
    console.error('Error handling timer completion:', error);
    socket.emit('error', { message: 'Failed to complete timer' });
  }
};
