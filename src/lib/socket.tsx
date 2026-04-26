import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  notifications: any[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => { },
  markAllRead: async () => { },
  markRead: async () => { },
});

export const useSocket = () => useContext(SocketContext);

const BASE_URL = import.meta.env.VITE_API_URL as string;
const API = `${BASE_URL}/api`;

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("wander.token");
    if (!token) return;

    const s = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    // Real-time notification
    s.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Real-time chat message — dispatch custom event for store to catch
    s.on("new_message", (data) => {
      window.dispatchEvent(new CustomEvent("socket:new_message", { detail: data }));
    });

    s.on("user_typing", (data) => {
      window.dispatchEvent(new CustomEvent("socket:typing", { detail: data }));
    });

    s.on("user_stop_typing", (data) => {
      window.dispatchEvent(new CustomEvent("socket:stop_typing", { detail: data }));
    });

    // Fetch initial notifications
    fetchNotificationsInternal(token);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchNotificationsInternal = async (token?: string) => {
    const t = token || localStorage.getItem("wander.token");
    if (!t) return;
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { }
  };

  const fetchNotifications = async () => fetchNotificationsInternal();

  const markAllRead = async () => {
    const token = localStorage.getItem("wander.token");
    if (!token) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { }
  };

  const markRead = async (id: string) => {
    const token = localStorage.getItem("wander.token");
    if (!token) return;
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      notifications,
      unreadCount,
      fetchNotifications,
      markAllRead,
      markRead,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
