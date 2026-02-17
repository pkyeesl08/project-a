import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RegionEntity } from '../regions/region.entity';

@Entity('schools')
export class SchoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['middle', 'high', 'university'] })
  type: string;

  @Column({ type: 'uuid' })
  regionId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verifiedDomain: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @ManyToOne(() => RegionEntity)
  @JoinColumn({ name: 'regionId' })
  region: RegionEntity;
}
