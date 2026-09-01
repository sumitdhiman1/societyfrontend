interface IconProps {
  className?: string;
}

export default function FacebookIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 33.891 33.891"
      className={className}
      fill="currentColor"
    >
      <path
        d="M30.26,2.25H3.631A3.631,3.631,0,0,0,0,5.881V32.51a3.631,3.631,0,0,0,3.631,3.631H14.014V24.619H9.248V19.2h4.766V15.062c0-4.7,2.8-7.3,7.086-7.3a28.873,28.873,0,0,1,4.2.366v4.615H22.935a2.712,2.712,0,0,0-3.058,2.93V19.2h5.2l-.832,5.423H19.877V36.141H30.26a3.631,3.631,0,0,0,3.631-3.631V5.881A3.631,3.631,0,0,0,30.26,2.25Z"
        transform="translate(0 -2.25)"
      />
    </svg>
  );
}

