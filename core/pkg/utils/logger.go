package utils

import (
	"fmt"
	"time"
)

type LogLevel int

const (
	LogLevelDebug LogLevel = iota
	LogLevelInfo
	LogLevelWarn
	LogLevelError
)

type Logger struct {
	Level LogLevel
}

func NewLogger(level LogLevel) *Logger {
	return &Logger{Level: level}
}

func (l *Logger) format(level, msg string, args ...any) string {
	ts := time.Now().Format("2006-01-02 15:04:05")
	formattedMsg := fmt.Sprintf(msg, args...)
	return fmt.Sprintf("[%s] [%s] %s", ts, level, formattedMsg)
}

func (l *Logger) Debug(msg string, args ...any) {
	if l.Level <= LogLevelDebug {
		fmt.Println(l.format("DEBUG", msg, args...))
	}
}

func (l *Logger) Info(msg string, args ...any) {
	if l.Level <= LogLevelInfo {
		fmt.Println(l.format("INFO ", msg, args...))
	}
}

func (l *Logger) Warn(msg string, args ...any) {
	if l.Level <= LogLevelWarn {
		fmt.Println(l.format("WARN ", msg, args...))
	}
}

func (l *Logger) Error(msg string, args ...any) {
	if l.Level <= LogLevelError {
		fmt.Println(l.format("ERROR", msg, args...))
	}
}
