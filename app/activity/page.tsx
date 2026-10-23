"use client";
import { useNotifications } from "@/lib/notifications-store";

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} onClick={() => !n.read && markAsRead(n.id)}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                n.read
                  ? "bg-white/3 border-white/8 hover:bg-white/5"
                  : "bg-violet-600/10 border-violet-500/20 hover:bg-violet-600/15"
              }`}>
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? "bg-white/20" : "bg-violet-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${n.read ? "text-gray-400" : "text-white"}`}>{n.title}</p>
                <p className="text-sm text-gray-400 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              {!n.read && (
                <span className="text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full font-medium shrink-0">New</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
