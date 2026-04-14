CREATE OR REPLACE PACKAGE BODY order_pkg AS
  PROCEDURE sync_order(p_order_id IN NUMBER, p_status IN VARCHAR2) IS
  BEGIN
    EXECUTE IMMEDIATE 'UPDATE orders SET status = ''' || p_status || ''' WHERE id = ' || p_order_id;
  END sync_order;
END order_pkg;
