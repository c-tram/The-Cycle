import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/Loading.css';

interface LoadingProps {
  message?: string;
}

const Loading = ({ message = 'Loading...' }: LoadingProps) => {
  return (
    <div className="loading-container">
      <FontAwesomeIcon icon={faSpinner} spin className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default Loading;
