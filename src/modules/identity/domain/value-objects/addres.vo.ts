export class Address {
  private constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly country: string,
    public readonly postalCode?: string,
  ) {
    if (!street.trim() || !city.trim() || !country.trim())
      throw new Error('Address fields cannot be empty');
  }

  static create(
    street: string,
    city: string,
    country: string,
    postalCode?: string,
  ): Address {
    return new Address(street, city, country, postalCode);
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.country === other.country &&
      this.postalCode === other.postalCode
    );
  }

  toString(): string {
    const parts = [this.street, this.city, this.country];
    if (this.postalCode) parts.push(this.postalCode);
    return parts.join(', ');
  }
}
