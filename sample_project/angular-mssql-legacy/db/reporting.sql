CREATE PROCEDURE dbo.SyncCustomerReport
AS
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = 'SELECT * FROM Customers WHERE Status = ''ACTIVE''';
  EXEC(@sql);
END
GO
