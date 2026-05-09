import React from 'react';
import { MOCK_NOTIFICATIONS } from '../services/mockData';
import { CheckCircle, AlertTriangle, Info, Heart, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Notifications: React.FC = () => {
  return (
    <div className="w-full pb-20 md:pb-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 cursor-pointer">
        <h2 className="text-xl font-bold text-textMain">Notifications</h2>
      </div>
      
      <div className="flex flex-col">
        {MOCK_NOTIFICATIONS.map((notif, i) => {
          let Icon = Info;
          let iconColor = 'text-blue-500';
          
          if (notif.type === 'success') {
            Icon = CheckCircle;
            iconColor = 'text-green-500';
          } else if (notif.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-yellow-500';
          }

          return (
            <motion.div 
              key={notif.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="border-b border-border p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-4"
            >
              <div className="pt-1">
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-textMain mb-1">{notif.message}</p>
                <p className="text-xs text-textMuted">{notif.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
