import { useState } from 'react';
import '../styles/WidgetCustomizer.css';

interface WidgetConfig {
  id: string;
  title: string;
  type: 'games' | 'leaders' | 'trends' | 'standings' | 'news';
  size: 'small' | 'medium' | 'large';
  position: number;
  enabled: boolean;
}

interface WidgetCustomizerProps {
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
  onClose: () => void;
}

const WidgetCustomizer = ({ widgets, onSave, onClose }: WidgetCustomizerProps) => {
  const [localWidgets, setLocalWidgets] = useState([...widgets]);

  const handleToggleWidget = (widgetId: string) => {
    setLocalWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, enabled: !widget.enabled }
          : widget
      )
    );
  };

  const handleSizeChange = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    setLocalWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, size }
          : widget
      )
    );
  };

  const handlePositionChange = (widgetId: string, direction: 'up' | 'down') => {
    const widgetIndex = localWidgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return;

    const newWidgets = [...localWidgets];
    const targetIndex = direction === 'up' ? widgetIndex - 1 : widgetIndex + 1;

    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      // Swap positions
      const temp = newWidgets[widgetIndex].position;
      newWidgets[widgetIndex].position = newWidgets[targetIndex].position;
      newWidgets[targetIndex].position = temp;

      // Swap elements
      [newWidgets[widgetIndex], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[widgetIndex]];
      
      setLocalWidgets(newWidgets);
    }
  };

  const handleSave = () => {
    onSave(localWidgets);
    onClose();
  };

  const handleReset = () => {
    setLocalWidgets([...widgets]);
  };

  const sortedWidgets = localWidgets.sort((a, b) => a.position - b.position);

  return (
    <div className="widget-customizer-overlay" onClick={onClose}>
      <div className="widget-customizer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="customizer-header">
          <h2>Customize Dashboard</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="customizer-content">
          <div className="widget-list">
            {sortedWidgets.map((widget, index) => (
              <div key={widget.id} className={`widget-item ${widget.enabled ? 'enabled' : 'disabled'}`}>
                <div className="widget-info">
                  <div className="widget-details">
                    <h4>{widget.title}</h4>
                    <span className="widget-type">{widget.type}</span>
                  </div>
                  
                  <div className="widget-controls">
                    <div className="size-selector">
                      <label>Size:</label>
                      <select 
                        value={widget.size} 
                        onChange={(e) => handleSizeChange(widget.id, e.target.value as 'small' | 'medium' | 'large')}
                        disabled={!widget.enabled}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="position-controls">
                      <button 
                        onClick={() => handlePositionChange(widget.id, 'up')}
                        disabled={index === 0 || !widget.enabled}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => handlePositionChange(widget.id, 'down')}
                        disabled={index === sortedWidgets.length - 1 || !widget.enabled}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="toggle-switch">
                      <input 
                        type="checkbox" 
                        id={`toggle-${widget.id}`}
                        checked={widget.enabled}
                        onChange={() => handleToggleWidget(widget.id)}
                      />
                      <label htmlFor={`toggle-${widget.id}`} className="switch">
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="customizer-footer">
          <button className="reset-btn" onClick={handleReset}>Reset</button>
          <div className="action-buttons">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetCustomizer;
