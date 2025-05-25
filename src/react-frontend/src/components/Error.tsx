import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import '../styles/Error.css';

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage = ({ message, onRetry }: ErrorProps) => {
  return (
    <div className="error-container">
      <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
