"use client";

import { useState } from "react";
import { Check, Trash, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export function Todo() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (newTodo.trim() === "") return;
    
    const newItem: TodoItem = {
      id: Date.now(),
      text: newTodo,
      completed: false,
    };
    
    setTodos([...todos, newItem]);
    setNewTodo("");
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const toggleComplete = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Yapılacaklar Listesi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Yeni görev ekle..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={addTodo}>
            <Plus className="h-4 w-4 mr-1" />
            Ekle
          </Button>
        </div>

        <div className="space-y-2">
          {todos.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Henüz görev eklenmedi. Yeni bir görev ekleyin!
            </p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleComplete(todo.id)}
                    id={`todo-${todo.id}`}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`${todo.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {todo.text}
                  </label>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteTodo(todo.id)}>
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {todos.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Toplam görev: {todos.length} | Tamamlanan: {todos.filter((t) => t.completed).length}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 