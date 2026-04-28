import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function OpenConnectLogo({ size = 44, className = '' }) {
  return (
    <div
      className={`inline-flex items-center justify-center text-primary ${className}`}
      style={{ width: size, height: size }}
      aria-label="OpenConnect"
    >
      <ChatBubbleLeftRightIcon className="h-[62%] w-[62%]" />
    </div>
  );
}
