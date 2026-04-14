CREATE OR REPLACE PACKAGE order_pkg AS
  PROCEDURE sync_order(p_order_id IN NUMBER, p_status IN VARCHAR2);
END order_pkg;
