import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDeleteRequest } from '../../context/DeleteRequestContext';

/**
 * Reusable action button/renderer for delete operations across all modules:
 * - If user is Admin or has `permission` -> renders direct Delete button (`onDirectDelete`).
 * - Otherwise -> renders "Request Delete" button (or "Pending" badge if already requested).
 */
export function DeleteActionButton({
  permission,
  module,
  entityId,
  entityMeta = null,
  entityLabel,
  entitySnapshot = null,
  onDirectDelete,
  className = '',
  style = {},
  title = 'Delete',
  requestTitle = 'Request Delete Approval from Admin',
  children,
  requestChildren,
  stopPropagation = true,
}) {
  const { hasPermission } = useAuth();
  const { openDeleteRequest, isPendingDelete } = useDeleteRequest();

  const canDirectDelete = hasPermission(permission);
  const pending = !canDirectDelete && isPendingDelete(module, entityId, entityMeta);

  const handleClick = (e) => {
    if (stopPropagation && e?.stopPropagation) {
      e.stopPropagation();
    }
    if (canDirectDelete) {
      onDirectDelete?.(e);
    } else if (!pending) {
      openDeleteRequest({
        module,
        entityId,
        entityMeta,
        entityLabel,
        entitySnapshot,
      });
    }
  };

  if (canDirectDelete) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        title={title}
        onClick={handleClick}
      >
        {children || '🗑️'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      style={{
        ...style,
        ...(pending
          ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
          : { color: '#d97706', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }),
      }}
      title={pending ? 'Delete approval pending from Admin' : requestTitle}
      onClick={handleClick}
    >
      {pending ? '⏳ Pending' : requestChildren || '📩 Req Del'}
    </button>
  );
}

export default DeleteActionButton;

