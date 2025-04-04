'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DateTimePickerProps {
  initialDate?: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  className?: string;
}

export const DateTimePicker = ({
  initialDate = new Date(),
  onDateChange,
  minDate,
  className,
}: DateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Set defaults for form
  const [hour12Format, setHour12Format] = useState<number>(
    initialDate.getHours() > 12 
      ? initialDate.getHours() - 12 
      : initialDate.getHours() === 0 
        ? 12 
        : initialDate.getHours()
  );
  const [minutes, setMinutes] = useState<number>(initialDate.getMinutes());
  const [ampm, setAmPm] = useState<'AM' | 'PM'>(initialDate.getHours() >= 12 ? 'PM' : 'AM');

  useEffect(() => {
    // Convert 12-hour format to 24-hour for internal date
    let hours24 = hour12Format;
    
    // Convert to 24 hour format
    if (ampm === 'PM' && hour12Format < 12) {
      hours24 = hour12Format + 12;
    } else if (ampm === 'AM' && hour12Format === 12) {
      hours24 = 0;
    }
    
    // Update the time portion of the selected date
    const updatedDate = new Date(selectedDate);
    updatedDate.setHours(hours24);
    updatedDate.setMinutes(minutes);
    updatedDate.setSeconds(0);
    updatedDate.setMilliseconds(0);
    
    // Make sure we don't go before the minimum date
    if (minDate && updatedDate < minDate) {
      setSelectedDate(new Date(minDate));
      onDateChange(new Date(minDate));
      return;
    }
    
    setSelectedDate(updatedDate);
    
    // Create an ISO string but preserve the local timezone information
    // by specifying the timezone offset explicitly in the passed date
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Date selected in timezone: ${userTimezone}`);
    console.log(`Local date: ${updatedDate.toLocaleString()}`);
    console.log(`ISO with timezone: ${updatedDate.toISOString()}`);
    
    onDateChange(updatedDate);
  }, [hour12Format, minutes, ampm, selectedDate, onDateChange, minDate]);

  // Generate the options for the hour select (12-hour format)
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1; // 1-12
    return (
      <option key={hour} value={hour}>
        {hour.toString().padStart(2, '0')}
      </option>
    );
  });

  // Generate the options for the minute select (all minutes 0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => (
    <option key={i} value={i}>
      {i.toString().padStart(2, '0')}
    </option>
  ));

  // Create a calendar UI
  const renderCalendar = () => {
    return (
      <div className="absolute z-10 mt-2 p-4 bg-[#1b1d23] border border-[#2c2e36] rounded-lg shadow-lg w-80">
        <div className="mb-4">
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              
              // Copy the time from the selected date
              newDate.setHours(selectedDate.getHours());
              newDate.setMinutes(selectedDate.getMinutes());
              
              // Make sure we don't go before the minimum date
              if (minDate && newDate < minDate) {
                setSelectedDate(new Date(minDate));
                return;
              }
              
              setSelectedDate(newDate);
            }}
            className="w-full px-3 py-2 bg-[#23262d] border border-[#2c2e36] rounded-md text-white focus:outline-none focus:border-[#0077B5]"
            min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => setIsCalendarOpen(false)}
            className="px-4 py-2 bg-[#0077B5] text-white rounded-md hover:bg-[#006699] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="flex items-center px-3 py-2 bg-[#23262d] border border-[#2c2e36] rounded-md text-white hover:bg-[#2c2e36] transition-colors focus:outline-none"
        >
          <Calendar size={16} className="mr-2" />
          {format(selectedDate, 'MMM d, yyyy')}
        </button>
        
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-white" />
          
          <select
            value={hour12Format}
            onChange={(e) => setHour12Format(Number(e.target.value))}
            className="px-2 py-2 bg-[#23262d] border border-[#2c2e36] rounded-md text-white focus:outline-none focus:border-[#0077B5]"
            aria-label="Hour"
          >
            {hourOptions}
          </select>
          
          <span className="text-white">:</span>
          
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="px-2 py-2 bg-[#23262d] border border-[#2c2e36] rounded-md text-white focus:outline-none focus:border-[#0077B5]"
            aria-label="Minute"
          >
            {minuteOptions}
          </select>
          
          <select
            value={ampm}
            onChange={(e) => setAmPm(e.target.value as 'AM' | 'PM')}
            className="px-2 py-2 bg-[#23262d] border border-[#2c2e36] rounded-md text-white focus:outline-none focus:border-[#0077B5]"
            aria-label="AM/PM"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      
      <div className="relative">
        {isCalendarOpen && renderCalendar()}
      </div>
    </div>
  );
}; 