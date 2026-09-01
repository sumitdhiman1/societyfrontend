const Avatar = ({ avatar }: { avatar: string }) => {
  return (
    <div className="w-10 h-10 rounded-full bg-[#E57850] overflow-hidden flex items-center justify-center border-2 border-gray-600 group-hover:border-white transition-colors relative">
      {avatar ? (
        <img
          src={avatar}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="scale-75 text-white">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default Avatar;
